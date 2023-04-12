using GoogleApi;
using GoogleApi.Entities.Common.Enums;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Maps.Directions.Request;
using GoogleApi.Entities.Maps.Geocoding.Address.Request;
using GoogleApi.Entities.Maps.Geocoding.Location.Request;
using Solution.Controllers;
using Solution.Models;

namespace Solution.Pathfinder;

public class GoogleMapService : IMapService
{
    public static string API_KEY = "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0";


    public async Task<List<Coordinate>> GetPath(Vehicle vehicle)
    {
        Coordinate lastPos = vehicle.destinations.Last().coordinate;
        List<WayPoint> wayPoints = new List<WayPoint>();

        foreach (Destination destination in vehicle.destinations)
        {
            wayPoints.Add(new WayPoint(new LocationEx(new CoordinateEx(destination.coordinate.latitude,
                destination.coordinate.longitude))));
        }

        var request = new DirectionsRequest
        {
            Key = API_KEY,
            Origin = new LocationEx(new CoordinateEx(vehicle.coordinate.latitude, vehicle.coordinate.longitude)),
            WayPoints = wayPoints,
            // OptimizeWaypoints = true,
            Destination = new LocationEx(new CoordinateEx(lastPos.latitude, lastPos.longitude))
        };

        var response = await GoogleApi.GoogleMaps.Directions.QueryAsync(request);

        if (response.Status == Status.Ok)
        {
            var points = new List<GoogleApi.Entities.Common.Coordinate>(response.Routes.First().OverviewPath.Line);
            return new List<Coordinate>(points.Select(e => new Coordinate { latitude = e.Latitude, longitude = e.Longitude }));
        }

        Console.WriteLine($"Google maps error: {response.Status}");
        Console.WriteLine(response.ErrorMessage);
        return new List<Coordinate>();
    }

    public async Task<Coordinate> GetAddressCoordinates(string address)
    {
        var request = new AddressGeocodeRequest
        {
            Address = address,
            Key = API_KEY
        };

        var response = GoogleMaps.Geocode.AddressGeocode.Query(request);

        if (response.Status == Status.Ok)
        {
            var location = response.Results.First().Geometry.Location;
            return new Coordinate{latitude = location.Latitude, longitude = location.Longitude};
        }

        return null;
    }

    public async Task<string> GetClosestAddress(Coordinate coordinate)
    {
        var request = new LocationGeocodeRequest
        {
            Key = API_KEY,
            Location = new GoogleApi.Entities.Common.Coordinate(coordinate.latitude, coordinate.longitude)
        };

        var response = GoogleMaps.Geocode.LocationGeocode.Query(request);
        return response.Status == Status.Ok ? response.Results.First().FormattedAddress : null;
    }

    public async Task<Vehicle> FindBestFittingVehicle(List<Vehicle> vehicles, Delivery data)
    {
        double tripDistance = await ((IMapService)this).GetDistance(data.pickup, data.dropoff);
        List<Vehicle> sortedVehicles = vehicles
            .Where(e => PlannerController.GetCurrentVehicleLoad(e) + data.size < e.maxLoad)
            .Where(e => e.destinations.Count <= 6) //Google maps api allows max 8 waypoints so only allow vehicles with 6 or less destinations
            .OrderBy(e => PlannerController.GetShortestDistance(e, data.pickup).Result + tripDistance)
            .ThenBy(e => e.maxLoad - PlannerController.GetCurrentVehicleLoad(e)).ToList();

        return sortedVehicles.Count == 0 ? null : sortedVehicles.First();
    }
}