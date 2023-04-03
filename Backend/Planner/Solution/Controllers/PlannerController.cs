using Microsoft.AspNetCore.Mvc;
using Solution.Models;
using System.Linq;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class TrackerController : ControllerBase
{
    [HttpPost("/add")]
    public Vehicle? addPath([FromBody] Coordinate data, [FromHeader] int size)
    {
        List<Vehicle> obj = Program.client.InvokeMethodAsync<List<Vehicle>>(HttpMethod.Get, "tracker", "track/all").Result;
        Console.WriteLine(obj);
        List<Vehicle> sortedVehicles = obj.Where(e => e.currentLoad + size < e.maxLoad).OrderBy(vech => CalculateDistance(new Coordinate() {Latitude = vech.latitude, Longitude = vech.longitude}, data)).ThenBy(e => e.maxLoad - e.currentLoad).ToList();
        Vehicle? vehicle = sortedVehicles.First();

        if (vehicle != null)
        {
            vehicle.destinations.Add(data);
            vehicle.currentLoad += size;
            Program.client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle).Wait();
            return vehicle;
        }

        return null;
    }

    public static double CalculateDistance(Coordinate coord1, Coordinate coord2)
    {
        double latDistance = coord2.Latitude - coord1.Latitude;
        double lonDistance = coord2.Longitude - coord1.Longitude;

        double distance = Math.Sqrt(Math.Pow(latDistance, 2) + Math.Pow(lonDistance, 2));
        return distance;
    }
}