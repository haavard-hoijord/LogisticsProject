using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        return await context.vehicles.Include(v => v.route).FirstOrDefaultAsync(v => v.id == id);
    }

    [HttpGet("/track/all")]
    public async Task<List<Vehicle>> getAll()
    {
        await using var context = new MysqlContext();

        var vehicles = new List<Vehicle>();
        try
        {
            vehicles.AddRange(context.vehicles.Include(v => v.route).ToList());
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
        context.vehicles.Update(vehicle);
        context.SaveChanges();

        Program.client.PublishEventAsync("status", "update_vehicle", new MessageUpdateData
        {
            id = vehicle.id,
            vehicle = vehicle
        });
    }

    [HttpPost("/add")]
    public async Task<ActionResult> add([FromBody] Vehicle vehicle)
    {
        try
        {
            Console.WriteLine("Adding vehicle");
            await using var context = new MysqlContext();
            context.vehicles.Add(vehicle);
            await context.SaveChangesAsync();

            Program.client.PublishEventAsync("status", "new_vehicle", new MessageUpdateData
            {
                id = vehicle.id,
                vehicle = vehicle
            });
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        }

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