using Microsoft.AspNetCore.Mvc;
using Solution.Models;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class CompanyController
{
    public static readonly List<Company> companies = new()
    {
        new Company
        {
            name = "Company A",
            id = "c1",
            image = "https://picsum.photos/seed/companyA/100?grayscale&blur=2"
        },
        new Company
        {
            name = "Company B",
            id = "c2",
            image = "https://picsum.photos/seed/companyB/100?grayscale&blur=2"
        },
        new Company
        {
            name = "Company C",
            id = "c3",
            image = "https://picsum.photos/seed/companyC/100?grayscale&blur=2"
        },
        new Company
        {
            name = "Company D",
            id = "c4",
            image = "https://picsum.photos/seed/companyD/100?grayscale&blur=2"
        }
    };

    [HttpGet("/companies")]
    public async Task<List<Company>> GetCompanies()
    {
        return companies;
    }
}