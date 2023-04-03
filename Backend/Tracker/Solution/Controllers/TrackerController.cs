using Microsoft.AspNetCore.Mvc;
using Solution.Models;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class TrackerController : ControllerBase
{
    [HttpGet("/track")]
    public Vehicle? track([FromBody] int id)
    {
        return Program.db.Vehicles.Find(id);
    }

    [HttpGet("/track/all")]
    public List<Vehicle> getAll()
    {
        return Program.db.Vehicles.ToList();
    }

    [HttpPost("/update")]
    public void update([FromBody] Vehicle vehicle)
    {
        Program.db.Vehicles.Update(vehicle);
        Program.db.SaveChanges();
    }

    [HttpPost("/add")]
    public void add([FromBody] Vehicle vehicle)
    {
        Program.db.Vehicles.Add(vehicle);
        Program.db.SaveChanges();
    }

    [HttpPost("/delete")]
    public void delete([FromBody] Vehicle vehicle)
    {
        Program.db.Vehicles.Remove(vehicle);
        Program.db.SaveChanges();
    }
}