using Dapr.Client;
using System;
using System.Timers;
using Solution.Models;
using Timer = System.Timers.Timer;

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

        app.UseHttpsRedirection();
        app.UseAuthorization();
        app.MapControllers();
        app.Run();
    }

    private static async void OnTimerElapsed(object sender, ElapsedEventArgs e)
    {
        var message = client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track/all");
        List<Vehicle> obj = await client.InvokeMethodAsync<List<Vehicle>>(message);

        foreach (var vehicle in obj)
        {
            if (vehicle.nodes.Count > 0)
            {
                Coordinate cords = vehicle.nodes.First();
                vehicle.coordinate = cords;
                vehicle.nodes.RemoveAt(0);
                List<Destination> removes = new List<Destination>();
                foreach (var dest in vehicle.destinations)
                {
                    if(CalculateDistance(cords, dest.coordinate) <= 0.00001)
                        removes.Add(dest);

                    var found = false;
                    foreach (var node in vehicle.nodes)
                    {
                        if (CalculateDistance(dest.coordinate, node) <= 0.00001)
                            found = true;
                    }

                    if (!found)
                    {
                        removes.Add(dest);
                    }
                }

                foreach(var rm in removes)
                {
                    vehicle.destinations.Remove(rm);
                }

                if (vehicle.nodes.Count == 0)
                {
                    vehicle.destinations.Clear();
                }

                var message2 = client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", vehicle);
                await client.InvokeMethodAsync(message2);
            }else if (vehicle.destinations.Count > 0)
            {
                vehicle.destinations.Clear();
            }
        }
    }

    public static double CalculateDistance(Coordinate coord1, Coordinate coord2)
    {
        if (coord1 == null || coord2 == null) return -1;

        double latDistance = coord2.latitude - coord1.latitude;
        double lonDistance = coord2.longitude - coord1.longitude;

        double distance = Math.Sqrt(Math.Pow(latDistance, 2) + Math.Pow(lonDistance, 2));
        return distance;
    }
}