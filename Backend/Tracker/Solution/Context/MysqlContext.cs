using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Solution.Models;

namespace Solution.Context;

public class MysqlContext : DbContext
{
    public DbSet<Vehicle> Vehicles { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        var connectionstring = "Server=db;Database=logistics;User=root;Password=password123;";
        optionsBuilder.UseMySql(connectionstring, ServerVersion.AutoDetect(connectionstring));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Vehicle>()
            .Property(e => e.destinations)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<Destination>>(v,
                    new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");
        modelBuilder.Entity<Vehicle>()
            .Property(e => e.coordinate)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<Coordinate>(v, new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");

        modelBuilder.Entity<Vehicle>()
            .Property(e => e.sections)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<RouteSection>>(v,
                    new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");
    }
}