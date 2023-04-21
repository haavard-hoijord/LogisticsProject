namespace Solution.Models;

public class Node
{
    public Coordinate coordinate { get; set; }
    public double speedLimit { get; set; } = 30;
    public int? routeId { get; set; }
}