using System.Text.Json;
using System.Text.Json.Serialization;
using PolylineEncoder.Net.Utility;
using Solution.Models;
using Solution.Pathfinder;

namespace Solution;

public static class Planner
{
    public static readonly PolylineUtility polylineEncoder = new();
    private static readonly IMapService defaultPathService = new GoogleMapService();

    public static readonly Dictionary<string, IMapService> mapServices = new()
    {
        { "google", new GoogleMapService() },
        { "mapbox", new MapBoxMapService() }
    };

    public static IMapService GetPathService(Vehicle vehicle)
    {
        return mapServices[vehicle.mapService];
    }

    public static IMapService GetDefaultPathService()
    {
        return defaultPathService;
    }

    public static async Task addPath(Delivery data)
    {
        var vehicle = await FindFittingVehicle(data);

        Console.WriteLine("Adding path to vehicle " + vehicle.id);

        if (vehicle != null)
            try
            {
                await AddDestination(data, vehicle);

                vehicle = await Program.client.InvokeMethodAsync<Vehicle>(
                    Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "Data", "track", vehicle.id));

                await GeneratePathNodes(vehicle);

                vehicle = await Program.client.InvokeMethodAsync<Vehicle>(
                    Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "Data", "track", vehicle.id));

                await FindClosetsDestinationNodes(vehicle);
                await GenerateDistanceValues(vehicle);

                await Program.client.InvokeMethodAsync(
                    Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "Data", "update", vehicle));

                Console.WriteLine("Added path to vehicle " + vehicle.id + " with " + vehicle.sections.Count +
                                  " sections");

                Program.client.PublishEventAsync("status", "new_path", new Dictionary<string, string>
                {
                    { "id", vehicle.id.ToString() },
                    { "delivery", JsonSerializer.Serialize(data) }
                });
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
            }
    }

    private static async Task<Vehicle> FindFittingVehicle(Delivery data)
    {
        var message = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "Data", "track/all");
        return await GetDefaultPathService()
            .FindBestFittingVehicle(await Program.client.InvokeMethodAsync<List<Vehicle>>(message), data);
    }

    public static Coordinate? GetDeliveryCoordinates(IMapService service, DeliveryDestination destination)
    {
        if (destination.type == "address")
            if (destination.coordinate == null)
                destination.coordinate = service.GetAddressCoordinates(destination.address).Result;

        return destination.coordinate;
    }

    private static Coordinate? GetDeliveryCoordinates(DeliveryDestination destination)
    {
        try
        {
            if (destination.type == "address")
            {
                destination.coordinate = GetDefaultPathService().GetAddressCoordinates(destination.address).Result;
                destination.type = "coords";
            }

            return new Coordinate
            {
                latitude = destination.coordinate.latitude,
                longitude = destination.coordinate.longitude
            };
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        }

        return null;
    }

    private static async Task AddDestination(Delivery data, Vehicle vehicle)
    {
        try
        {
            var routeId = 1;

            if (vehicle.destinations.Count > 0) routeId = vehicle.destinations.Max(e => e.routeId) + 1;

            vehicle.destinations.Add(new Destination
            {
                coordinate = GetDeliveryCoordinates(data.pickup), load = data.pickup.size, isPickup = true,
                routeId = routeId,
                address = data.pickup.type == "address"
                    ? data.pickup.address
                    : await GetPathService(vehicle).GetClosestAddress(data.pickup.coordinate)
            });

            vehicle.destinations.Add(new Destination
            {
                coordinate = GetDeliveryCoordinates(data.dropoff), load = data.dropoff.size, isPickup = false,
                routeId = routeId,
                address = data.dropoff.type == "address"
                    ? data.dropoff.address
                    : await GetPathService(vehicle).GetClosestAddress(data.dropoff.coordinate)
            });

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

            await Program.client.InvokeMethodAsync(
                Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "Data", "update", vehicle));
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            Console.WriteLine(JsonSerializer.Serialize(vehicle,
                new JsonSerializerOptions
                {
                    WriteIndented = true,
                    NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
                }));
        }
    }

    public static async Task GeneratePathNodes(Vehicle vehicle)
    {
        try
        {
            var sections = await GetPathService(vehicle).GetPath(vehicle);

            var obj = await Program.client.InvokeMethodAsync<Vehicle>(
                Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "Data", "track", vehicle.id));
            obj.sections = sections;
            await Program.client.InvokeMethodAsync(
                Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "Data", "update", obj));
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            Console.WriteLine(JsonSerializer.Serialize(vehicle,
                new JsonSerializerOptions
                {
                    WriteIndented = true,
                    NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
                }));
        }
    }

    public static int GetCurrentVehicleLoad(Vehicle vehicle)
    {
        return vehicle.destinations.Where(e => !e.isPickup).Select(s => s.load).Sum();
    }

    public static async Task FindClosetsDestinationNodes(Vehicle vehicle)
    {
        foreach (var dest in vehicle.destinations)
        {
            Coordinate closestNode = null;
            foreach (var node in vehicle.sections)
            foreach (var cord in polylineEncoder.Decode(node.polyline)
                         .Select(e => new Coordinate { latitude = e.Latitude, longitude = e.Longitude }))
                if (closestNode == null || await GetPathService(vehicle).GetDistance(closestNode, dest.coordinate) >
                    await GetPathService(vehicle).GetDistance(cord, dest.coordinate))
                    closestNode = cord;

            if (closestNode != null) dest.closestNode = closestNode;
        }
    }

    public static async Task GenerateDistanceValues(Vehicle vehicle)
    {
        var allCords = vehicle.sections.SelectMany(section => polylineEncoder.Decode(section.polyline).Select(e => new Coordinate { latitude = e.Latitude, longitude = e.Longitude })).ToList();

        var lastCord = 0;
        foreach (var dest in vehicle.destinations.Where(e => e.closestNode != null))
        {
            var dist = 0.0;

            for (var k = lastCord; k < allCords.Count - 1; k++)
            {
                if (allCords[k + 1].latitude == dest.closestNode?.latitude
                    && allCords[k + 1].longitude == dest.closestNode?.longitude)
                {
                    dest.distance = dist;
                    lastCord = k;
                    break;
                }

                dist += await GetPathService(vehicle).GetDistance(allCords[k], allCords[k + 1]);
            }
        }
    }

    public static async Task<double> GetShortestDistance(Vehicle vehicle, Coordinate coordinate)
    {
        if (vehicle == null || coordinate == null) return double.NaN;

        var distance = double.NaN;

        var nodes = new List<Coordinate>(vehicle?.destinations?.Select(e => e.coordinate));
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
        try
        {
            return CalculateDistance(coord1.latitude, coord1.longitude, coord2.latitude, coord2.longitude);
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            return double.NaN;
        }
    }

    public static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        try
        {
            const double EarthRadiusInKm = 6371;

            var lat1InRadians = DegreesToRadians(lat1);
            var lon1InRadians = DegreesToRadians(lon1);
            var lat2InRadians = DegreesToRadians(lat2);
            var lon2InRadians = DegreesToRadians(lon2);

            var deltaLat = lat2InRadians - lat1InRadians;
            var deltaLon = lon2InRadians - lon1InRadians;

            var a = Math.Sin(deltaLat / 2) * Math.Sin(deltaLat / 2) +
                    Math.Cos(lat1InRadians) * Math.Cos(lat2InRadians) *
                    Math.Sin(deltaLon / 2) * Math.Sin(deltaLon / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return EarthRadiusInKm * c;
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            return double.NaN;
        }
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * (Math.PI / 180);
    }
}