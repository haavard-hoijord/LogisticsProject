using Dapr;
using Microsoft.AspNetCore.Mvc;
using Solution.Models;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class PubsubController : ControllerBase
{
    [Consumes("application/json")]
    [HttpPost("pickup")]
    [Topic("status", "pickup")]
    public async Task<ActionResult> Pickup([FromBody] MessageData data)
    {
        var requestMessage = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track", data.id);
        var obj = await Program.client.InvokeMethodAsync<Vehicle>(requestMessage);

        var dest = obj.destinations.Where(dest => dest.isPickup && dest.routeId == data.route)
            .OrderBy(e => PlannerController.GetShortestDistance(obj, e.coordinate)).First();
        obj.destinations.Remove(dest);

        var message2 = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", obj);
        await Program.client.InvokeMethodAsync(message2);

        await Program.client.InvokeMethodAsync(HttpMethod.Post, "planner", "update", obj);

        return Ok();
    }

    [Consumes("application/json")]
    [HttpPost("delivery")]
    [Topic("status", "delivery")]
    public async Task<ActionResult> Delivery([FromBody] MessageData data)
    {
        var requestMessage = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track", data.id);
        var obj = await Program.client.InvokeMethodAsync<Vehicle>(requestMessage);

        var dest = obj.destinations.Where(dest => !dest.isPickup && dest.routeId == data.route)
            .OrderBy(e => PlannerController.GetShortestDistance(obj, e.coordinate)).First();
        obj.destinations.Remove(dest);

        var message2 = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", obj);
        await Program.client.InvokeMethodAsync(message2);

        await Program.client.InvokeMethodAsync(HttpMethod.Post, "planner", "update", obj);

        return Ok();
    }

    public class MessageData
    {
        public int id { get; set; }
        public int route { get; set; }
        public double latitude { get; set; }
        public double longitude { get; set; }
    }
}