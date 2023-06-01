using Solution.Models;

namespace Solution;

public class BackendTicks
{
    public static async void TickBackend()
    {
        try
        {
            var obj = await Program.client.InvokeMethodAsync<List<Vehicle>>(HttpMethod.Get, "Database", "track/all");

            foreach (var vehicle in obj.Where(e => e.route != null).Where(vehicle => vehicle.route.destinations.Count > 0 && vehicle.route.sections.Count <= 0))
            {
                //Program.client.InvokeMethodAsync(HttpMethod.Post, "Deliveries", "update", vehicle);
            }
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        }
    }
}