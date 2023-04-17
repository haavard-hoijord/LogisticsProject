using Microsoft.AspNetCore.Mvc;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class CompanyController
{
    public static readonly List<string> companies = new()
    {
        "Company A",
        "Company B",
        "Company C",
        "Company D"
    };

    [HttpGet("/companies")]
    public async Task<List<string>> GetCompanies()
    {
        return companies;
    }
}