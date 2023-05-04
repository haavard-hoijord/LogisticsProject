namespace Solution.Models;

public class Vehicle
{
    public int id { get; set; }

    public string company { get; set; }
    public string mapService { get; set; }

    public int maxWeight { get; set; }
    public int width { get; set; } = 20;
    public int height { get; set; } = 10;
    public int depth { get; set; } = 10;

    public List<Package> packages { get; set; } = new();

    public Coordinate coordinate { get; set; }

    public int? routeId { get; set; }
    public Route? route { get; set; }
}