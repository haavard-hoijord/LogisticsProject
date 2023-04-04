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
using WayPoint = GoogleApi.Entities.Maps.Directions.Request.WayPoint;

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
        List<Vehicle> sortedVehicles = obj
            .Where(e => GetLoad(e) + size < e.maxLoad)
            .Where(e => e.destinations.Count <= 6) //Google maps api allows max 8 waypoints so only allow vehicles with 6 or less destinations
            .OrderBy(vech => CalculateDistance(vech.coordinate, data.pickup))
            .ThenBy(vech => CalculateDistance(vech.coordinate, data.dropoff))
            .ThenBy(e => e.maxLoad - GetLoad(e)).ToList();
        Vehicle? vehicle = sortedVehicles.First();

        if (vehicle != null)
        {
            int routeId = 1;

            if (vehicle.destinations.Count > 0)
            {
                routeId = vehicle.destinations.Max(e => e.routeId) + 1;
            }

            vehicle.destinations.Add(new Destination {coordinate = data.pickup, load = size, isPickup = true, routeId = routeId});
            vehicle.destinations.Add(new Destination {coordinate = data.dropoff, load = 0, isPickup = false, routeId = routeId});

            List<Destination> destinations = new List<Destination>(vehicle.destinations);
            vehicle.destinations = new List<Destination>();

            Destination? lastDestination = null;

            while (destinations.Count > 0)
            {
                destinations.OrderBy(pos => CalculateDistance(lastDestination != null ? lastDestination.coordinate : vehicle.coordinate, pos.coordinate)).ToList();
                destinations.Sort(((des1, des2) =>
                {
                    if (des1.routeId == des2.routeId)
                    {
                        if (des1.isPickup)
                            return -1;

                        if (des2.isPickup)
                            return 1;
                    }
                    return 0;
                }));

                lastDestination = destinations.First();
                destinations.Remove(lastDestination);
                vehicle.destinations.Add(lastDestination);
            }

            Coordinate lastPos = vehicle.destinations.Last().coordinate;
            List<WayPoint> wayPoints = new List<WayPoint>();

            foreach (Destination destination in vehicle.destinations)
            {
                wayPoints.Add(new WayPoint(new LocationEx(new CoordinateEx(destination.coordinate.latitude, destination.coordinate.longitude))));
            }
            
            var request = new DirectionsRequest
            {
                Key = "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0",
                Origin = new LocationEx(new CoordinateEx(vehicle.coordinate.latitude, vehicle.coordinate.longitude)),
                WayPoints = wayPoints,
               // OptimizeWaypoints = true,
                Destination = new LocationEx(new CoordinateEx(lastPos.latitude, lastPos.longitude))
            };

            var response = await GoogleApi.GoogleMaps.Directions.QueryAsync(request);

            if (response.Status == Status.Ok)
            {
                var points = new List<GoogleApi.Entities.Common.Coordinate>(response.Routes.First().OverviewPath.Line);
                vehicle.nodes = new List<Coordinate>(points.Select(e => new Coordinate{latitude = e.Latitude, longitude = e.Longitude}));
            }
            else
            {
                Console.WriteLine($"Google maps error: {response.Status}");
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