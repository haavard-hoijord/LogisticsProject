using System.ComponentModel.DataAnnotations;
using GoogleApi.Entities.Common;
using GoogleApi.Entities.Maps.Directions.Response;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;

namespace Solution.Models;

public class Directions
{
    [Key]
    public string key { get; set; }

    public List<Coordinate> directions { get; set; }
}