using Microsoft.AspNetCore.Mvc;
using Solution.Context;
using Solution.Models;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class VehicleDataController : ControllerBase
{
    [HttpGet("/track")]
    public async Task<Vehicle?> track([FromBody] int id)
    {
        await using var context = new MysqlContext();
        return await context.vehicles.FindAsync(id);
    }

    [HttpGet("/track/all")]
    public async Task<List<Vehicle>> getAll()
    {
        await using var context = new MysqlContext();

        var vehicles = new List<Vehicle>();
        try
        {
            vehicles.AddRange(context.vehicles.ToList());
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
        var entity = context.vehicles.Find(vehicle.id);

        if (entity != null)
        {
            entity.company = vehicle.company;
            entity.coordinate = vehicle.coordinate;
            entity.destinations = vehicle.destinations;
            entity.maxLoad = vehicle.maxLoad;
            entity.sections = vehicle.sections;
            entity.lowResPolyline = vehicle.lowResPolyline;

            context.vehicles.Update(entity);
            context.SaveChanges();

            Program.client.PublishEventAsync("status", "update_vehicle", new MessageUpdateData
            {
                id = vehicle.id,
                vehicle = vehicle
            });
        }
    }

    [HttpPost("/add")]
    public async Task<ActionResult> add([FromBody] Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        context.vehicles.Add(vehicle);
        await context.SaveChangesAsync();

        Program.client.PublishEventAsync("status", "new_vehicle", new MessageUpdateData
        {
            id = vehicle.id,
            vehicle = vehicle
        });

        return Ok();
    }


    [HttpPost("/delete")]
    public async Task<ActionResult> delete([FromBody] Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        context.vehicles.Remove(vehicle);
        await context.SaveChangesAsync();

        Program.client.PublishEventAsync("status", "remove_vehicle", new MessageUpdateData
        {
            id = vehicle.id
        });

        return Ok();
    }

    public class MessageUpdateData
    {
        public int id { get; set; }
        public Vehicle? vehicle { get; set; }
    }
}