using Microsoft.AspNetCore.Mvc;
using Solution.Models;
using System.Linq;
using System.Text;
using System.Text.Json;
using GoogleApi.Entities.Common.Enums;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Maps.Directions.Request;
using GoogleApi.Entities.Maps.Directions.Response;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;
using Vehicle = Solution.Models.Vehicle;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class TrackerController : ControllerBase
{
    [HttpPost("/add")]
    public async Task<Vehicle?> addPath([FromBody] Delivery data)
    {
        int size = data.size;
        var message = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track/all");
        List<Vehicle> obj = await Program.client.InvokeMethodAsync<List<Vehicle>>(message);
        List<Vehicle> sortedVehicles = obj.Where(e => GetLoad(e) + size < e.maxLoad).OrderBy(vech => CalculateDistance(vech.coordinate, data.pickup)).ThenBy(vech => CalculateDistance(vech.coordinate, data.dropoff)).ThenBy(e => e.maxLoad - GetLoad(e)).ToList();
        Vehicle? vehicle = sortedVehicles.First();

        if (vehicle != null)
        {
            int routeId = 1;

            if (vehicle.destinations.Count > 0)
            {
                routeId = vehicle.destinations.Max(e => e.routeId) + 1;
            }

            vehicle.destinations.Add(new Destination(){coordinate = data.pickup, load = size, isPickup = true, routeId = routeId});
            vehicle.destinations.Add(new Destination(){coordinate = data.dropoff, load = 0, isPickup = false, routeId = routeId});

            List<Destination> destinations = new List<Destination>(vehicle.destinations);
            vehicle.destinations = new List<Destination>();


            Destination? lastDestination = null;

            while (destinations.Count > 0)
            {
                destinations.OrderBy(pos => CalculateDistance(lastDestination != null ? lastDestination.coordinate : vehicle.coordinate, pos.coordinate)).ToList();
                destinations.Sort(new Comparison<Destination>(((des1, des2) =>
                {
                    if (des1.routeId == des2.routeId)
                    {
                        if (des1.isPickup)
                            return -1;

                        if (des2.isPickup)
                            return 1;
                    }
                    return 0;
                })));

                lastDestination = destinations.First();
                destinations.Remove(lastDestination);
                vehicle.destinations.Add(lastDestination);
            }

            List<Tuple<Coordinate, Coordinate>> paths = new List<Tuple<Coordinate, Coordinate>>();
            Coordinate cords = vehicle.coordinate;

            foreach (Destination destination in vehicle.destinations)
            {
                paths.Add(new Tuple<Coordinate, Coordinate>(cords, destination.coordinate));
                cords = destination.coordinate;
            }

            var num = 0;
            foreach (var path in paths)
            {
                var request = new DirectionsRequest
                {
                    Key = "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0",
                    Origin = new LocationEx(new CoordinateEx(path.Item1.latitude, path.Item1.longitude)),
                    Destination = new LocationEx(new CoordinateEx(path.Item2.latitude, path.Item2.longitude))
                };

                var key = vehicle.Id + "-" + num;
                var response = await GoogleApi.GoogleMaps.Directions.QueryAsync(request);

                if (response.Status == Status.Ok)
                {
                    var message1 = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "path/add", new Directions{key = key, directions = new List<GoogleApi.Entities.Common.Coordinate>(response.Routes.First().OverviewPath.Line)});
                    await Program.client.InvokeMethodAsync(message1);
                }
                num++;
            }

            var message2 = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", vehicle);
            await Program.client.InvokeMethodAsync(message2);
            return vehicle;
        }

        return null;
    }

    public static int GetLoad(Vehicle vehicle)
    {
        return vehicle.destinations.Select(s => s.load).Sum();
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