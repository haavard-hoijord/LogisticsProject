using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Solution.Models;
using Solution.Pathfinder;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class PlannerController : ControllerBase
{
    private static readonly double baseDistance = CalculateDistance(new Coordinate
    {
        latitude = 40.0,
        longitude = -100.0
    }, new Coordinate
    {
        latitude = 40.00898315,
        longitude = -100.0
    }); // One km distance


    private static readonly IMapService defaultPathService = new GoogleMapService();

    private static readonly Dictionary<string, IMapService> mapServices = new()
    {
        { "google", new GoogleMapService() },
        { "mapbox", new MapBoxMapService() }
    };

    [HttpPost("/address")]
    public async Task<Coordinate> GetCoordinateFromAddress([FromBody] Dictionary<string, string> address)
    {
        return await GetDefaultPathSerivce().GetAddressCoordinates(address["address"]);
    }

    [HttpPost("/address/closest")]
    public async Task<string> getClosestAddress([FromBody] Coordinate coordinate)
    {
        return await GetDefaultPathSerivce().GetClosestAddress(coordinate);
    }

    [HttpGet("/health")]
    public IActionResult CheckHealth()
    {
        return Ok();
    }

    [HttpPost("/add")]
    public async Task<Vehicle?> addPath([FromBody] Delivery data)
    {
        var vehicle = await FindFittingVehicle(data);

        if (vehicle != null)
        {
            AddDestination(data, vehicle);

            Program.client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle);

            await GeneratePathNodes(vehicle);
            await FindClosetsDestinationNodes(vehicle);
            await GenerateDistanceValues(vehicle);

            var request =  Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", vehicle);
            var response = Program.client.InvokeMethodWithResponseAsync(request);

            Program.client.PublishEventAsync("status", "new_path", new Dictionary<string, string>
            {
                { "id", vehicle.id.ToString() },
                { "delivery", JsonSerializer.Serialize(data) }
            });

            return vehicle;
        }

        return null;
    }
    [HttpGet("/mapmodes")]
    public async Task<List<string>> getMapModes()
    {
        return mapServices.Keys.ToList();
    }

    public static IMapService GetPathService(Vehicle vehicle)
    {
        return mapServices[vehicle.mapService];
    }

    public static IMapService GetDefaultPathSerivce()
    {
        return defaultPathService;
    }

    private static async Task<Vehicle> FindFittingVehicle(Delivery data)
    {
        var message = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track/all");
        return await GetDefaultPathSerivce()
            .FindBestFittingVehicle(await Program.client.InvokeMethodAsync<List<Vehicle>>(message), data);
    }

    public static Coordinate GetDeliveryCoordinates(IMapService service , DeliveryDestination destination)
    {
        if (destination.type == "address")
        {
            if (destination.coordinate == null)
            {
                destination.coordinate = service.GetAddressCoordinates(destination.address).Result;
            }
        }

        return destination.coordinate;
    }

    private static Coordinate GetDeliveryCoordinates(DeliveryDestination destination)
    {
        if(destination.type == "address")
            return GetDefaultPathSerivce().GetAddressCoordinates(destination.address).Result;

        return new Coordinate
        {
            latitude = destination.coordinate.latitude,
            longitude = destination.coordinate.longitude
        };
    }

    private static async void AddDestination(Delivery data, Vehicle vehicle)
    {
        var routeId = 1;

        if (vehicle.destinations.Count > 0) routeId = vehicle.destinations.Max(e => e.routeId) + 1;

        vehicle.destinations.Add(new Destination { coordinate = GetDeliveryCoordinates(data.pickup), load = data.pickup.size, isPickup = true, routeId = routeId, address = data.pickup.type == "map" ? data.pickup.address : await GetPathService(vehicle).GetClosestAddress(data.pickup.coordinate)});
        vehicle.destinations.Add(new Destination { coordinate = GetDeliveryCoordinates(data.dropoff), load = data.dropoff.size, isPickup = false, routeId = routeId, address = data.dropoff.type == "map" ? data.dropoff.address : await GetPathService(vehicle).GetClosestAddress(data.dropoff.coordinate)});

        var destinations = new List<Destination>(vehicle.destinations);
        vehicle.destinations = new List<Destination>();

        Destination? lastDestination = null;

        while (destinations.Count > 0)
        {
            destinations.Sort((des1, des2) =>
            {
                if (des1.routeId == des2.routeId)
                {
                    if (des1.isPickup && !des2.isPickup)
                        return -1;

                    if (des2.isPickup && !des1.isPickup)
                        return 1;
                }

                var dis1 = GetPathService(vehicle)
                    .GetDistance(lastDestination != null ? lastDestination.coordinate : vehicle.coordinate,
                        des1.coordinate).Result;

                var dis2 = GetPathService(vehicle)
                    .GetDistance(lastDestination != null ? lastDestination.coordinate : vehicle.coordinate,
                        des2.coordinate).Result;

                return dis1.CompareTo(dis2);
            });

            lastDestination = destinations.First();
            destinations.Remove(lastDestination);
            vehicle.destinations.Add(lastDestination);
        }
    }

    private async Task GeneratePathNodes(Vehicle vehicle)
    {
        vehicle.nodes = await GetPathService(vehicle).GetPath(vehicle);
    }

    public static int GetCurrentVehicleLoad(Vehicle vehicle)
    {
        return vehicle.destinations.Where(e => !e.isPickup).Select(s => s.load).Sum();
    }

    private static async Task FindClosetsDestinationNodes(Vehicle vehicle)
    {
        foreach (var dest in vehicle.destinations)
        {
            Coordinate closestNode = null;
            foreach (var node in vehicle.nodes)
                if (closestNode == null || await GetPathService(vehicle).GetDistance(closestNode, dest.coordinate) >
                    await GetPathService(vehicle).GetDistance(node.coordinate, dest.coordinate))
                    closestNode = node.coordinate;

            if (closestNode != null) dest.closestNode = closestNode;
        }
    }

    private async Task GenerateDistanceValues(Vehicle vehicle)
    {
        for (int i = 0; i < vehicle.destinations.Count; i++)
        {
            var dist = 0.0;

            if (vehicle.destinations[i].closestNode != null)
            {
                for(int j = i; j < vehicle.nodes.Count - 1; j++)
                {
                    if(vehicle.nodes[j + 1].coordinate.latitude == vehicle.destinations[i].closestNode.latitude
                       && vehicle.nodes[j + 1].coordinate.longitude == vehicle.destinations[i].closestNode.longitude)
                    {
                        vehicle.destinations[i].distance = dist;
                        break;
                    }

                    dist += await GetPathService(vehicle).GetDistance(vehicle.nodes[j].coordinate, vehicle.nodes[j + 1].coordinate);
                }
            }
        }
    }

    public static async Task<double> GetShortestDistance(Vehicle vehicle, Coordinate coordinate)
    {
        var distance = double.NaN;

        var nodes = new List<Coordinate>(vehicle.destinations.Select(e => e.coordinate));
        nodes.Add(vehicle.coordinate);

        nodes.ForEach(e =>
        {
            var dis = GetPathService(vehicle).GetDistance(e, coordinate).Result;
            if (double.IsNaN(distance) || dis < distance) distance = dis;
        });

        return distance;
    }

    public static double CalculateDistance(Coordinate coord1, Coordinate coord2)
    {
        return CalculateDistance(coord1.latitude, coord1.longitude, coord2.latitude, coord2.longitude);
    }

    public static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double EarthRadiusInKm = 6371;

        double lat1InRadians = DegreesToRadians(lat1);
        double lon1InRadians = DegreesToRadians(lon1);
        double lat2InRadians = DegreesToRadians(lat2);
        double lon2InRadians = DegreesToRadians(lon2);

        double deltaLat = lat2InRadians - lat1InRadians;
        double deltaLon = lon2InRadians - lon1InRadians;

        double a = Math.Sin(deltaLat / 2) * Math.Sin(deltaLat / 2) +
                   Math.Cos(lat1InRadians) * Math.Cos(lat2InRadians) *
                   Math.Sin(deltaLon / 2) * Math.Sin(deltaLon / 2);

        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusInKm * c;
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * (Math.PI / 180);
    }
}