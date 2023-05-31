using Microsoft.AspNetCore.Mvc;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet("/health")]
    public IActionResult CheckHealth()
    {
        return Ok();
    }
}