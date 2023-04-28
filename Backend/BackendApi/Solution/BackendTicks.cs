using Solution.Models;

namespace Solution;

public class BackendTicks
{
    public static async void TickBackend()
    {
        try
        {
            var obj = await Program.client.InvokeMethodAsync<List<Vehicle>>(HttpMethod.Get, "VehicleData", "track/all");

            foreach (var vehicle in obj.Where(vehicle => vehicle.destinations.Count > 0 && vehicle.sections.Count <= 0))
            {
                //Program.client.InvokeMethodAsync(HttpMethod.Post, "DeliveryPlanner", "update", vehicle);
            }
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        }
    }
}