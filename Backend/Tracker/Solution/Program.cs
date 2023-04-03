using Dapr.Client;
using Microsoft.EntityFrameworkCore;
using Solution.Context;

public class Program
{
    public static DaprClient client;
    public static MysqlContext db;


    public static void Main(string[] args)
    {
        client = new DaprClientBuilder().Build();
        client.WaitForSidecarAsync().Wait();

        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAllOrigins",
                builder =>
                {
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
        });

        builder.Services.AddControllers();
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            c.ResolveConflictingActions((apiDescriptions) => apiDescriptions.First());
        });

        var app = builder.Build();

        var serviceProvider = new ServiceCollection()
            .AddDbContext<MysqlContext>()
            .BuildServiceProvider();


        using (var context = serviceProvider.GetService<MysqlContext>())
        {
                context.Database.EnsureCreated();
                //context.Database.Migrate(); // Apply migrations
        }
        db = new MysqlContext();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
            app.UseDeveloperExceptionPage();
        }

        app.UseRouting();
        app.UseCors("AllowAllOrigins");
        //app.UseHttpsRedirection();
        app.UseAuthorization();
        app.MapControllers();

        app.Run();
    }
}