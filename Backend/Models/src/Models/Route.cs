namespace Solution.Models;

public class Route
{
    public int id { get; set; }

    public string mapService { get; set; }
    public List<Destination> destinations { get; set; } = new();
    public List<RouteSection> sections { get; set; } = new();
    public string? overviewPolyline { get; set; }
}