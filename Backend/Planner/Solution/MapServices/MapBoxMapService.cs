using System.Text.Json;
using Newtonsoft.Json;
using Solution.Controllers;
using Solution.Models;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Solution.Pathfinder;

public class MapBoxMapService : IMapService
{
    public static string API_KEY = "pk.eyJ1IjoiaGFhdmFyZGgiLCJhIjoiY2xnZG4wbXJiMDV1NzNlcGxzOW9sM2l6eCJ9.viXU_wJiYNSXDizV7Tu3NQ";


    private static readonly HttpClient httpClient = new HttpClient();

    public async Task<List<Coordinate>> GetPath(Vehicle vehicle)
    {
        string waypoints = "";

        foreach (Destination destination in vehicle.destinations)
        {
            waypoints += $"{destination.coordinate.longitude},{destination.coordinate.latitude};";
        }

        string directionsUrl = $"https://api.mapbox.com/directions/v5/mapbox/driving/{vehicle.coordinate.longitude},{vehicle.coordinate.latitude};{waypoints}{vehicle.destinations.Last().coordinate.longitude},{vehicle.destinations.Last().coordinate.latitude}?steps=true&access_token={API_KEY}";

        HttpResponseMessage response = await httpClient.GetAsync(directionsUrl);

        if (response.IsSuccessStatusCode)
        {
            string responseBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine(responseBody);
            var js = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var steps = js.GetProperty("routes").EnumerateArray().First().GetProperty("geometry").GetProperty("coordinates").EnumerateArray().ToList();
            return steps.Select(e => new Coordinate
            {
                longitude = e.EnumerateArray().First().GetDouble(), latitude = e.EnumerateArray().Last().GetDouble()
            }).ToList();
        }
        else
        {
            Console.WriteLine($"Error: {response.StatusCode}");
        }

        return new List<Coordinate>();
    }

    public async Task<Coordinate> GetAddressCoordinates(string address)
    {
        string geocodingUrl = $"https://api.mapbox.com/geocoding/v5/mapbox.places/{Uri.EscapeDataString(address)}.json?access_token={API_KEY}";
        HttpResponseMessage response = await httpClient.GetAsync(geocodingUrl);

        if (response.IsSuccessStatusCode)
        {
            string responseBody = await response.Content.ReadAsStringAsync();
            var js = JsonSerializer.Deserialize<JsonElement>(responseBody);
            return new Coordinate
            {
                longitude = js.GetProperty("features").EnumerateArray().First().GetProperty("center").EnumerateArray().First().GetDouble(),
                latitude = js.GetProperty("features").EnumerateArray().First().GetProperty("center").EnumerateArray().Last().GetDouble()
            };
        }
        else
        {
            Console.WriteLine($"Error: {response.StatusCode}");
        }

        return null;

    }

    public async Task<string> GetClosestAddress(Coordinate coordinate)
    {
        string geocodingUrl = $"https://api.mapbox.com/geocoding/v5/mapbox.places/{coordinate.longitude},{coordinate.latitude}.json?access_token={API_KEY}";

        HttpResponseMessage response = await httpClient.GetAsync(geocodingUrl);

        if (response.IsSuccessStatusCode)
        {
            string responseBody = await response.Content.ReadAsStringAsync();
            var js = JsonSerializer.Deserialize<JsonElement>(responseBody);
            return js.GetProperty("features").EnumerateArray().First().GetProperty("place_name").GetString();
        }
        else
        {
            Console.WriteLine($"Error: {response.StatusCode}");
        }

        return null;
    }

    public async Task<Vehicle> FindBestFittingVehicle(List<Vehicle> vehicles, Delivery data)
    {
        double tripDistance = await ((IMapService)this).GetDistance(data.pickup, data.dropoff);
        List<Vehicle> sortedVehicles = vehicles
            .Where(e => PlannerController.GetCurrentVehicleLoad(e) + data.size < e.maxLoad)
            .OrderBy(e => PlannerController.GetShortestDistance(e, data.pickup).Result + tripDistance)
            .ThenBy(e => e.maxLoad - PlannerController.GetCurrentVehicleLoad(e)).ToList();

        return sortedVehicles.Count == 0 ? null : sortedVehicles.First();
    }
}