namespace Solution.Models;

public class Route
{
    public int id { get; set; }
    public Vehicle vehicle { get; set; }

    public List<Destination> destinations { get; set; }
    public List<RouteSection> sections { get; set; }
    public string? overviewPolyline { get; set; }
}