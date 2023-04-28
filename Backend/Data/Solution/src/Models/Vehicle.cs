namespace Solution.Models;

public class Vehicle
{
    public int id { get; set; }

    public string company { get; set; }
    public string mapService { get; set; }
    public int maxLoad { get; set; }

    public Coordinate coordinate { get; set; }

    public int routeId { get; set; }
    public Route route { get; set; }
}