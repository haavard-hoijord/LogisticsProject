using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Solution.Controllers;

namespace Solution.Models;

public class Vehicle
{
    [Key]
    public int id { get; }

    public string company { get; set; }
    public double latitude { get; set; }
    public double longitude { get; set; }
    public int currentLoad { get; set; }
    public int maxLoad { get; set; }

    public List<Coordinate> destinations { get; set; }
}