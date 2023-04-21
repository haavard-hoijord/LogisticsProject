using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using Solution.Models;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;

namespace Solution.Context;

public class MysqlContext : DbContext
{
    public DbSet<Vehicle> Vehicles { get; set; }

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

        modelBuilder.Entity<Vehicle>()
            .Property(e => e.nodes)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<Node>>(v, new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");
    }
}