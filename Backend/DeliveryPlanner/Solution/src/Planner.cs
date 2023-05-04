using System.Text.Json;
using System.Text.Json.Serialization;
using PolylineEncoder.Net.Utility;
using Solution.Models;
using Solution.Pathfinder;
using Route = Solution.Models.Route;

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

    public static IMapService GetPathService(Route route)
    {
        return mapServices[route.mapService];
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
                var route = await GenerateRoute(vehicle, data);

                vehicle = await Program.client.InvokeMethodAsync<Vehicle>(
                    Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "Data", "track", vehicle.id));
                vehicle.route = route;

                await Program.client.InvokeMethodAsync(
                    Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "Data", "update", vehicle));

                Console.WriteLine("Added path to vehicle " + vehicle.id + " with " + vehicle.route.sections.Count +
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

    public static async Task<Route> GenerateRoute(Vehicle vehicle, Delivery delivery)
    {
        var route = vehicle.route ?? new Route
        {
            mapService = vehicle.mapService
        };

        await AddDestination(delivery, route);
        await GeneratePathNodes(vehicle, route);
        await FindClosetsDestinationNodes(route);
        await GenerateDistanceValues(route);

        return route;
    }

    private static async Task<Vehicle> FindFittingVehicle(Delivery data)
    {
        try
        {
            var message = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "Data", "track/all");
            return await GetDefaultPathService().FindBestFittingVehicle(await Program.client.InvokeMethodAsync<List<Vehicle>>(message), data);
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        }

        return null;
    }

    public static bool PackageFits(Vehicle vehicle, Package package)
    {
        var usedVolume = vehicle.packages.Sum(e => e.width * e.height * e.depth);
        var usedWeight = vehicle.packages.Sum(e => e.weight);

        if (usedVolume + package.width * package.height * package.depth <=
            vehicle.width * vehicle.height * vehicle.depth && usedWeight + package.weight <= vehicle.maxWeight)
        {
            var vehiclePackages = vehicle.route == null
                ? new List<Package>()
                : vehicle.route.destinations.Where(e => e.isPickup).Select(e => e.package).ToList();

            var grid = new GridObject[vehicle.width, vehicle.height, vehicle.depth];
            var missedPackages = PackageGrid.Fill3DArray(grid, vehiclePackages);

            var packages = new List<Package>(vehiclePackages);
            packages.Add(package);

            var missedPackages2 = PackageGrid.Fill3DArray(grid, new List<Package> { package });

            if (missedPackages2.Count > missedPackages.Count)
                return false;

            return true;
        }

        return false;
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

    private static async Task AddDestination(Delivery data, Route route)
    {
        try
        {
            var routeId = 1;

            if (route.destinations.Count > 0) routeId = route.destinations.Max(e => e.routeId) + 1;

            if (data.pickup.package != null) data.pickup.package.routeId = routeId;

            if (data.dropoff.package != null) data.dropoff.package.routeId = routeId;

            route.destinations.Add(new Destination
            {
                coordinate = GetDeliveryCoordinates(data.pickup), package = data.pickup.package, isPickup = true,
                routeId = routeId,
                address = data.pickup.type == "address"
                    ? data.pickup.address
                    : await GetPathService(route).GetClosestAddress(data.pickup.coordinate)
            });

            route.destinations.Add(new Destination
            {
                coordinate = GetDeliveryCoordinates(data.dropoff), package = data.dropoff.package, isPickup = false,
                routeId = routeId,
                address = data.dropoff.type == "address"
                    ? data.dropoff.address
                    : await GetPathService(route).GetClosestAddress(data.dropoff.coordinate)
            });


            var destinations = new List<Destination>(route.destinations);
            route.destinations = new List<Destination>();

            Destination? lastDestination = destinations.First();

            while (destinations.Count > 0)
            {
                destinations.Sort((des1, des2) =>
                {
                    if (des1 == null && des2 == null) return 0;
                    if (des1 == null) return -1; // Treat null as smaller than any non-null value
                    if (des2 == null) return 1; // Treat null as smaller than any non-null value

                    if (des1.routeId == des2.routeId)
                    {
                        if (des1.isPickup && !des2.isPickup)
                            return -1;

                        if (des2.isPickup && !des1.isPickup)
                            return 1;
                    }

                    if (des1.coordinate == null && des2.coordinate == null) return 0;
                    if (des1.coordinate == null) return -1; // Treat null as smaller than any non-null value
                    if (des2.coordinate == null) return 1; // Treat null as smaller than any non-null value


                    var dis1 = GetPathService(route).GetDistance(lastDestination.coordinate, des1.coordinate).Result;
                    var dis2 = GetPathService(route).GetDistance(lastDestination.coordinate, des2.coordinate).Result;

                    return NullSafeDoubleCompare(dis1, dis2);
                });

                lastDestination = destinations.First();
                destinations.Remove(lastDestination);
                route.destinations.Add(lastDestination);
            }
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            Console.WriteLine(JsonSerializer.Serialize(route,
                new JsonSerializerOptions
                {
                    WriteIndented = true,
                    NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
                }));
        }
    }

    static int NullSafeDoubleCompare(double? x, double? y, double epsilon = 1e-9)
    {
        if (x == null && y == null)
        {
            return 0;
        }
        if (x == null || x == double.NaN)
        {
            return -1; // Treat null as smaller than any non-null value
        }
        if (y == null || y == double.NaN)
        {
            return 1; // Treat null as smaller than any non-null value
        }

        if (Math.Abs(x.Value - y.Value) < epsilon)
        {
            return 0;
        }

        return x.Value.CompareTo(y.Value);
    }

    public static async Task GeneratePathNodes(Vehicle vehicle, Route route)
    {
        try
        {
            if (route.sections == null)
                route.sections = new List<RouteSection>();

            route.sections.AddRange(await GetPathService(route).GetPath(vehicle.coordinate, route));
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            Console.WriteLine(JsonSerializer.Serialize(route,
                new JsonSerializerOptions
                {
                    WriteIndented = true,
                    NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
                }));
        }
    }

    public static async Task FindClosetsDestinationNodes(Route route)
    {
        foreach (var dest in route.destinations)
        {
            Coordinate closestNode = null;
            foreach (var node in route.sections)
            foreach (var cord in polylineEncoder.Decode(node.polyline)
                         .Select(e => new Coordinate { latitude = e.Latitude, longitude = e.Longitude }))
                if (closestNode == null || await GetPathService(route).GetDistance(closestNode, dest.coordinate) >
                    await GetPathService(route).GetDistance(cord, dest.coordinate))
                    closestNode = cord;

            if (closestNode != null) dest.closestNode = closestNode;
        }
    }

    public static async Task GenerateDistanceValues(Route route)
    {
        var allCords = route.sections.SelectMany(section =>
            polylineEncoder.Decode(section.polyline)
                .Select(e => new Coordinate { latitude = e.Latitude, longitude = e.Longitude })).ToList();

        var lastCord = 0;
        foreach (var dest in route.destinations.Where(e => e.closestNode != null))
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

                dist += await GetPathService(route).GetDistance(allCords[k], allCords[k + 1]);
            }
        }
    }

    public static async Task<double> GetShortestDistance(Vehicle vehicle, Coordinate coordinate)
    {
        if (vehicle == null || coordinate == null) return double.NaN;

        var distance = double.NaN;

        var nodes = new List<Coordinate>();
        nodes.Add(vehicle.coordinate);

        if (vehicle.route != null && vehicle.route.destinations is { Count: > 0 })
            nodes.AddRange(vehicle.route.destinations.Select(e => e.coordinate));

        nodes.ForEach(e =>
        {
            var dis = (vehicle.route != null ? GetPathService(vehicle.route) : GetDefaultPathService())
                .GetDistance(e, coordinate).Result;
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