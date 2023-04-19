using System.Timers;
using Dapr.Client;
using Solution.Models;
using Timer = System.Timers.Timer;

// ReSharper disable All

public class Program
{
    public static DaprClient client;

    public static void Main(string[] args)
    {
        client = new DaprClientBuilder().Build();
        client.WaitForSidecarAsync().Wait();

        Timer timer = new Timer(1 * 1000);
        timer.Elapsed += Simulate;
        timer.AutoReset = true;
        timer.Enabled = true;

        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAllOrigins",
                builder =>
                {
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
        });

        // Add services to the container.

        builder.Services.AddControllers().AddDapr();
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            c.ResolveConflictingActions((apiDescriptions) => apiDescriptions.First());
        });

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseRouting();
        app.UseCors("AllowAllOrigins");
        app.UseAuthorization();

        app.UseWebSockets();
        app.UseMiddleware<WebSocketMiddleware>();

        app.UseCloudEvents();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapSubscribeHandler();
            endpoints.MapControllers();
        });
        app.MapControllers();


        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/dapr"))
            {
                var targetUrl = $"http://localhost:3500{context.Request.Path.Value.Replace("/dapr", "")}";
                var targetRequestMessage = new HttpRequestMessage()
                {
                    Method = new HttpMethod(context.Request.Method),
                    RequestUri = new Uri(targetUrl),
                    Content = new StreamContent(context.Request.Body)
                };

                // Forward headers from the original request to the target request
                foreach (var header in context.Request.Headers)
                {
                    if (!targetRequestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()) &&
                        targetRequestMessage.Content != null)
                    {
                        targetRequestMessage.Content.Headers.TryAddWithoutValidation(header.Key,
                            header.Value.ToArray());
                    }
                }

                using (var responseMessage = await new HttpClient().SendAsync(targetRequestMessage,
                           HttpCompletionOption.ResponseHeadersRead, context.RequestAborted))
                {
                    context.Response.StatusCode = (int)responseMessage.StatusCode;
                    var responseHeaders = responseMessage.Headers.ToDictionary(h => h.Key, h => h.Value.First());

                    foreach (var header in responseHeaders)
                    {
                        context.Response.Headers[header.Key] = header.Value;
                    }

                    using (var responseStream = await responseMessage.Content.ReadAsStreamAsync())
                    {
                        await responseStream.CopyToAsync(context.Response.Body, context.RequestAborted);
                    }
                }
            }
            else
            {
                await next();
            }
        });

        app.Run();
    }

    private static readonly Dictionary<int, double> vehicleProgress = new Dictionary<int, double>();

    private static async void Simulate(object sender, ElapsedEventArgs e)
    {
        try
        {
            List<Vehicle> obj = await client.InvokeMethodAsync<List<Vehicle>>(HttpMethod.Get, "tracker", "track/all");

            foreach (var vehicle in obj)
            {
                if (vehicle.nodes.Count > 0)
                {
                    Coordinate cords = vehicle.nodes.First();
                    var latDif = (cords.latitude - vehicle.coordinate.latitude) * 0.1;
                    var lngDif = (cords.longitude - vehicle.coordinate.longitude) * 0.1;
                    vehicle.coordinate = new Coordinate
                    {
                        latitude = vehicle.coordinate.latitude + latDif,
                        longitude = vehicle.coordinate.longitude + lngDif
                    };


                    //TODO Multiply gain by distance duration
                    
                    if (vehicleProgress[vehicle.id] >= 1)
                    {
                        vehicle.coordinate = cords;
                        vehicle.nodes.RemoveAt(0);
                        vehicleProgress.Remove(vehicle.id);
                    }

                    if (vehicleProgress.ContainsKey(vehicle.id))
                    {
                        vehicleProgress.Add(vehicle.id, vehicleProgress[vehicle.id] + 0.1);
                    }
                    else
                    {
                        vehicleProgress.Add(vehicle.id, 0.1);
                    }

                    foreach (var dest in vehicle.destinations)
                    {
                        if (dest.closestNode != null)
                        {
                            if (dest.closestNode.latitude == cords.latitude &&
                                dest.closestNode.longitude == cords.longitude)
                            {
                                var messageData = new MessageData
                                {
                                    id = vehicle.id,
                                    route = dest.routeId,
                                    latitude = dest.coordinate.latitude,
                                    longitude = dest.coordinate.longitude
                                };

                                if (dest.isPickup)
                                {
                                    client.PublishEventAsync("status", "pickup", messageData);
                                }
                                else
                                {
                                    client.PublishEventAsync("status", "delivery", messageData);
                                }
                            }
                        }
                    }

                    if (vehicle.nodes.Count == 0)
                    {
                        vehicle.destinations.Clear();
                    }

                    await client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle);
                }
                else if (vehicle.destinations.Count > 0)
                {
                    vehicle.destinations.Clear();
                    await client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
        }
    }

    public class MessageData
    {
        public int id { get; set; }
        public int route { get; set; }
        public double latitude { get; set; }
        public double longitude { get; set; }
    }
}