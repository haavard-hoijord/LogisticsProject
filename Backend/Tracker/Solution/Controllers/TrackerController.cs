using System.Text.Json;
using GoogleApi.Entities.Maps.Directions.Response;
using Microsoft.AspNetCore.Mvc;
using Solution.Context;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;
using Vehicle = Solution.Models.Vehicle;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class TrackerController : ControllerBase
{
    [HttpGet("/health")]
    public IActionResult CheckHealth()
    {
        return Ok();
    }

    [HttpGet("/track")]
    public async Task<Vehicle?> track([FromBody] int id)
    {
        await using var context = new MysqlContext();
        return await context.Vehicles.FindAsync(id);
    }

    [HttpGet("/track/all")]
    public async Task<List<Vehicle>> getAll()
    {
        await using var context = new MysqlContext();

        List<Vehicle> vehicles = new List<Vehicle>();
        try
        {
            vehicles.AddRange(context.Vehicles.ToList());
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
        }
        return vehicles;
    }

    [HttpPost("/update")]
    public void update([FromBody] Vehicle vehicle)
    {
        using var context = new MysqlContext();
        var entity = context.Vehicles.Find(vehicle.Id);

        if (entity != null)
        {
            entity.company = vehicle.company;
            entity.coordinate = vehicle.coordinate;
            entity.destinations = vehicle.destinations;
            entity.maxLoad = vehicle.maxLoad;
            entity.nodes = vehicle.nodes;;

            context.Vehicles.Update(entity);
            context.SaveChanges();

            Program.client.PublishEventAsync("vehicle_update", "update_vehicle", JsonSerializer.Serialize(new Dictionary<string, string>()
            {
                {"id", vehicle.Id.ToString()},
                {"vehicle", JsonSerializer.Serialize(entity)}
            }));
        }
    }

    [HttpPost("/add")]
    public async Task<ActionResult> add([FromBody] Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        context.Vehicles.Add(vehicle);
        await context.SaveChangesAsync();

        Program.client.PublishEventAsync("vehicle_update", "new_vehicle", JsonSerializer.Serialize(new Dictionary<string, object>()
        {
            {"id", vehicle.Id},
            {"vehicle", JsonSerializer.Serialize(vehicle)}
        }));

        return Ok();
    }


    [HttpPost("/delete")]
    public async Task<ActionResult> delete([FromBody] Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        context.Vehicles.Remove(vehicle);
        await context.SaveChangesAsync();

        Program.client.PublishEventAsync("vehicle_update", "remove_vehicle", JsonSerializer.Serialize(new Dictionary<string, object>()
        {
            {"id", vehicle.Id}
        }));

        return Ok();
    }
}