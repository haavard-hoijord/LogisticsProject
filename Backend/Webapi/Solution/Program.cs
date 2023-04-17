using Dapr.Client;
using System;
using System.Text.Json;
using System.Timers;
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

        Timer timer = new Timer(5 * 1000);
        timer.Elapsed += OnTimerElapsed;
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

        builder.Services.AddControllers();
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

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });

        app.MapControllers();

        app.Run();
    }

    private static async void OnTimerElapsed(object sender, ElapsedEventArgs e)
    {
        try
        {
            List<Vehicle> obj = await Program.client.InvokeMethodAsync<List<Vehicle>>(HttpMethod.Get, "tracker", "track/all");

            foreach (var vehicle in obj)
            {
                if (vehicle.nodes.Count > 0)
                {
                    Coordinate cords = vehicle.nodes.First();
                    vehicle.coordinate = cords;
                    vehicle.nodes.RemoveAt(0);

                    foreach (var dest in vehicle.destinations)
                    {
                        if (dest.closestNode != null)
                        {
                            if (dest.closestNode.latitude == cords.latitude &&
                                dest.closestNode.longitude == cords.longitude)
                            {
                                var messageData = new MessageData
                                {
                                    id = vehicle.Id,
                                    route = dest.routeId,
                                    latitude = dest.coordinate.latitude,
                                    longitude = dest.coordinate.longitude
                                };

                                if (dest.isPickup)
                                {
                                    Program.client.PublishEventAsync("delivery_status", "pickup", messageData);
                                }
                                else
                                {
                                    Program.client.PublishEventAsync("delivery_status", "delivery", messageData);

                                }
                            }
                        }
                    }

                    if (vehicle.nodes.Count == 0)
                    {
                        vehicle.destinations.Clear();
                    }

                    await client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle);
                }else if (vehicle.destinations.Count > 0)
                {
                    vehicle.destinations.Clear();
                    await client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle);
                }
            }
        }catch(Exception ex)
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