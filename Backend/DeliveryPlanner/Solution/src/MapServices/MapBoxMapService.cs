using System.Text.Json;
using PolylineEncoder.Net.Utility;
using Solution.Models;

namespace Solution.Pathfinder;

public class MapBoxMapService : IMapService
{
    public static string API_KEY = Environment.GetEnvironmentVariable("MAPBOX_API_TOKEN");


    private static readonly HttpClient httpClient = new();
    private static readonly PolylineUtility polylineEncoder = new();

    public async Task<List<RouteSection>> GetPath(Vehicle vehicle)
    {
        var waypoints = "";

        if (vehicle.destinations.Count > 1)
            foreach (var destination in vehicle.destinations.GetRange(0, vehicle.destinations.Count - 1))
                waypoints += $"{destination.coordinate.longitude},{destination.coordinate.latitude};";

        // string directionsUrl = $"https://api.mapbox.com/directions/v5/mapbox/driving/{vehicle.coordinate.longitude},{vehicle.coordinate.latitude};{waypoints}{vehicle.destinations.Last().coordinate.longitude},{vehicle.destinations.Last().coordinate.latitude}?steps=true&access_token={API_KEY}";
        var destinations =
            $"{vehicle.coordinate.longitude},{vehicle.coordinate.latitude};{waypoints}{vehicle.destinations.Last().coordinate.longitude},{vehicle.destinations.Last().coordinate.latitude}";
        var directionsUrl =
            $"https://api.mapbox.com/optimized-trips/v1/mapbox/driving/{destinations}?source=first&destination=last&roundtrip=false&access_token={API_KEY}";

        var response = await httpClient.GetAsync(directionsUrl);

        if (response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            var js = JsonSerializer.Deserialize<JsonElement>(responseBody);

            if (js.GetProperty("code").GetString() != "Ok")
                return new List<RouteSection>();

            var polyline = js.GetProperty("trips").EnumerateArray().First().GetProperty("geometry").GetString();
            var cords = polylineEncoder.Decode(polyline)
                .Select(e => new Coordinate { longitude = e.Longitude, latitude = e.Latitude }).ToList();
            return new List<RouteSection>
            {
                new()
                {
                    polyline = Planner.polylineEncoder.Encode(cords.Select(e =>
                        new Tuple<double, double>(e.latitude, e.longitude))),
                    speedLimit = 1
                }
            };
        }

        Console.WriteLine($"Error: {response.StatusCode}");

        return new List<RouteSection>();
    }

    public async Task<Coordinate> GetAddressCoordinates(string address)
    {
        var geocodingUrl =
            $"https://api.mapbox.com/geocoding/v5/mapbox.places/{Uri.EscapeDataString(address)}.json?access_token={API_KEY}&autocomplete=false";
        var response = await httpClient.GetAsync(geocodingUrl);

        if (response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            var js = JsonSerializer.Deserialize<JsonElement>(responseBody);
            return new Coordinate
            {
                longitude = js.GetProperty("features").EnumerateArray().First().GetProperty("center").EnumerateArray()
                    .First().GetDouble(),
                latitude = js.GetProperty("features").EnumerateArray().First().GetProperty("center").EnumerateArray()
                    .Last().GetDouble()
            };
        }

        Console.WriteLine($"Error: {response.StatusCode}");

        return null;
    }

    public async Task<string> GetClosestAddress(Coordinate coordinate)
    {
        var geocodingUrl =
            $"https://api.mapbox.com/geocoding/v5/mapbox.places/{coordinate.longitude},{coordinate.latitude}.json?access_token={API_KEY}";

        var response = await httpClient.GetAsync(geocodingUrl);

        if (response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            var js = JsonSerializer.Deserialize<JsonElement>(responseBody);
            return js.GetProperty("features").EnumerateArray().First().GetProperty("place_name").GetString();
        }

        Console.WriteLine($"Error: {response.StatusCode}");

        return null;
    }

    public async Task<Vehicle> FindBestFittingVehicle(List<Vehicle> vehicles, Delivery data)
    {
        var tripDistance = await ((IMapService)this).GetDistance(
            Planner.GetDeliveryCoordinates(this, data.pickup),
            Planner.GetDeliveryCoordinates(this, data.dropoff));
        var sortedVehicles = vehicles
            .Where(e => Planner.GetCurrentVehicleLoad(e) + data.pickup.size < e.maxLoad)
            .OrderBy(e =>
                Planner.GetShortestDistance(e, Planner.GetDeliveryCoordinates(this, data.pickup))
                    .Result + tripDistance)
            .ThenBy(e => e.maxLoad - Planner.GetCurrentVehicleLoad(e)).ToList();

        return sortedVehicles.Count == 0 ? null : sortedVehicles.First();
    }
}