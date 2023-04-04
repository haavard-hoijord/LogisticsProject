using System.Text.Json;
using GoogleApi.Entities.Maps.Directions.Response;
using Microsoft.EntityFrameworkCore;
using Solution.Models;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;
using Vehicle = Solution.Models.Vehicle;

namespace Solution.Context;

public class MysqlContext : DbContext
{
    public DbSet<Vehicle> Vehicles { get; set; }
    public DbSet<Directions> Directions { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        string connectionstring = "Server=db;Database=logistics;User=root;Password=password123;";
        optionsBuilder.UseMySql(connectionstring, ServerVersion.AutoDetect(connectionstring));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Vehicle>()
            .Property(e => e.destinations)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<Destination>>(v, new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");
        modelBuilder.Entity<Vehicle>()
            .Property(e => e.coordinate)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<Coordinate>(v, new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");

        modelBuilder.Entity<Directions>()
            .Property(e => e.directions)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<GoogleApi.Entities.Common.Coordinate>>(v, new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");
    }
}