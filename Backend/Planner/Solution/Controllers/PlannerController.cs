using Microsoft.AspNetCore.Mvc;
using Solution.Models;
using System.Linq;
using System.Text;
using System.Text.Json;
using Google.Type;
using GoogleApi;
using GoogleApi.Entities.Common.Enums;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Maps.Directions.Request;
using GoogleApi.Entities.Maps.Directions.Response;
using GoogleApi.Entities.Maps.Geocoding.Address.Request;
using Solution.Pathfinder;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;
using Vehicle = Solution.Models.Vehicle;
using WayPoint = GoogleApi.Entities.Maps.Directions.Request.WayPoint;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class PlannerController : ControllerBase
{
    [HttpPost("/address")]
    public async Task<Coordinate> GetCoordinateFromAddress([FromBody] Dictionary<String, String> address)
    {
        return await GetDefaultPathSerivce().GetAddressCoordinates(address["address"]);
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

            //Program.client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle);

            await GeneratePathNodes(vehicle);
            await FindClosetsDestinationNodes(vehicle);

            var res = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", vehicle);

            Console.WriteLine(res.ToString());
            Console.WriteLine(await res.Content.ReadAsStringAsync());

            var response = await Program.client.InvokeMethodWithResponseAsync(res);
            Console.WriteLine(response.ToString());
            Console.WriteLine(await response.Content.ReadAsStringAsync());

            Program.client.PublishEventAsync("vehicle_update", "new_path", new Dictionary<string, string>()
            {
                {"id", vehicle.Id.ToString()},
                {"delivery", JsonSerializer.Serialize(data)}
            });

            return vehicle;
        }

        return null;
    }

    private static readonly IPathService pathService = new GooglePathService();

    private static IPathService GetPathService(Vehicle vehicle)
    {
        return GetDefaultPathSerivce();
    }

    private static IPathService GetDefaultPathSerivce()
    {
        return pathService;
    }

    private static async Task<Vehicle> FindFittingVehicle(Delivery data)
    {
        var message = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track/all");
        return await GetDefaultPathSerivce()
            .FindBestFittingVehicle(await Program.client.InvokeMethodAsync<List<Vehicle>>(message), data);
    }

    private static void AddDestination(Delivery data, Vehicle vehicle)
    {
        int routeId = 1;

        if (vehicle.destinations.Count > 0)
        {
            routeId = vehicle.destinations.Max(e => e.routeId) + 1;
        }

        vehicle.destinations.Add(new Destination { coordinate = data.pickup, load = data.size, isPickup = true, routeId = routeId, closestNode = new Coordinate()});
        vehicle.destinations.Add(new Destination { coordinate = data.dropoff, load = data.size, isPickup = false, routeId = routeId, closestNode = new Coordinate()});

        List<Destination> destinations = new List<Destination>(vehicle.destinations);
        vehicle.destinations = new List<Destination>();

        Destination? lastDestination = null;

        while (destinations.Count > 0)
        {
            //destinations.OrderBy(pos => GetPathService(vehicle).GetDistance(lastDestination != null ? lastDestination.coordinate : vehicle.coordinate, pos.coordinate)).ToList();
            destinations.Sort(((des1, des2) =>
            {
                if (des1.routeId == des2.routeId)
                {
                    if (des1.isPickup && !des2.isPickup)
                        return -1;

                    if (des2.isPickup && !des1.isPickup)
                        return 1;
                }

                var dis1 = GetPathService(vehicle).GetDistance(lastDestination != null ? lastDestination.coordinate : vehicle.coordinate, des1.coordinate).Result;
                var dis2 = GetPathService(vehicle).GetDistance(lastDestination != null ? lastDestination.coordinate : vehicle.coordinate, des2.coordinate).Result;
                return dis1.CompareTo(dis2);
            }));

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
            {
                if (closestNode == null || await GetPathService(vehicle).GetDistance(closestNode, dest.coordinate) >
                    await GetPathService(vehicle).GetDistance(node, dest.coordinate))
                {
                    closestNode = node;
                }
            }

            if (closestNode != null)
            {
                dest.closestNode = closestNode;
            }
        }
    }

    public static async Task<double> GetShortestDistance(Vehicle vehicle, Coordinate coordinate)
    {
        double distance = Double.NaN;

        vehicle.destinations.ForEach(async e =>
        {
            var dis = await GetPathService(vehicle).GetDistance(e.coordinate, coordinate);
            if (Double.IsNaN(distance) || dis < distance)
            {
                distance = dis;
            }
        });

        return distance;
    }

    public static double CalculateDistance(Coordinate coord1, Coordinate coord2)
    {
        if (coord1 == null || coord2 == null) return -1;

        double latDistance = coord2.latitude - coord1.latitude;
        double lonDistance = coord2.longitude - coord1.longitude;

        double distance = Math.Sqrt(Math.Pow(latDistance, 2) + Math.Pow(lonDistance, 2));
        return distance;
    }
}