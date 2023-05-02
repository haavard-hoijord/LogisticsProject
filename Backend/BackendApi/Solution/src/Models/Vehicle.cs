namespace Solution.Models;

public class Vehicle
{
    public int id { get; set; }

    public string company { get; set; }
    public string mapService { get; set; }

    public int maxWeight { get; set; }
    public int maxVolume { get; set; }

    public List<Package> packages { get; set; } = new List<Package>();

    public Coordinate coordinate { get; set; }

    public int? routeId { get; set; }
    public Route? route { get; set; }
}