using System.Text.Json;
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
        var requestMessage = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "VehicleData", "track", data.id);
        var obj = await Program.client.InvokeMethodAsync<Vehicle>(requestMessage);

        var requestAddress = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "DeliveryPlanner", "address/closest",
            new Coordinate { longitude = data.longitude, latitude = data.latitude });
        var res = Program.client.InvokeMethodWithResponseAsync(requestAddress);
        var address = res.Result.Content.ReadAsStringAsync().Result;
        WebSocketMiddleware.SendMessageToAllAsync(JsonSerializer.Serialize(new Dictionary<string, object>
        {
            {
                "data", new MessageStatusData
                {
                    id = data.id,
                    vehicle = obj,
                    route = address
                }
            },
            { "type", "pickup" }
        }));
        return Ok();
    }

    [Consumes("application/json")]
    [HttpPost("delivery")]
    [Topic("status", "delivery")]
    public async Task<ActionResult> Delivery([FromBody] MessageData data)
    {
        var requestMessage = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "VehicleData", "track", data.id);
        var obj = await Program.client.InvokeMethodAsync<Vehicle>(requestMessage);

        var requestAddress = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "DeliveryPlanner", "address/closest",
            new Coordinate { longitude = data.longitude, latitude = data.latitude });
        var res = Program.client.InvokeMethodWithResponseAsync(requestAddress);
        var address = res.Result.Content.ReadAsStringAsync().Result;

        WebSocketMiddleware.SendMessageToAllAsync(JsonSerializer.Serialize(new Dictionary<string, object>
        {
            {
                "data", new MessageStatusData
                {
                    id = data.id,
                    vehicle = obj,
                    route = address
                }
            },
            { "type", "delivery" }
        }));
        return Ok();
    }


    [HttpPost("update_vehicle")]
    [Topic("status", "update_vehicle")]
    public async Task<ActionResult> VehicleUpdate([FromBody] MessageUpdateData data)
    {
        WebSocketMiddleware.SendMessageToAllAsync(JsonSerializer.Serialize(new Dictionary<string, object>
        {
            { "data", data },
            { "type", "update_vehicle" }
        }));
        return Ok();
    }

    [HttpPost("new_vehicle")]
    [Topic("status", "new_vehicle")]
    public async Task<ActionResult> VehicleAdd([FromBody] MessageUpdateData data)
    {
        WebSocketMiddleware.SendMessageToAllAsync(JsonSerializer.Serialize(new Dictionary<string, object>
        {
            { "data", data },
            { "type", "add_vehicle" }
        }));
        return Ok();
    }

    [HttpPost("remove_vehicle")]
    [Topic("status", "remove_vehicle")]
    public async Task<ActionResult> VehicleRemove([FromBody] MessageUpdateData data)
    {
        WebSocketMiddleware.SendMessageToAllAsync(JsonSerializer.Serialize(new Dictionary<string, object>
        {
            { "data", data },
            { "type", "remove_vehicle" }
        }));
        return Ok();
    }

    public class MessageUpdateData
    {
        public int id { get; set; }
        public Vehicle? vehicle { get; set; }
    }

    public class MessageStatusData : MessageUpdateData
    {
        public string route { get; set; }
    }

    public class MessageData
    {
        public int id { get; set; }
        public int route { get; set; }
        public double latitude { get; set; }
        public double longitude { get; set; }
    }
}