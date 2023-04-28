using Microsoft.AspNetCore.Mvc;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class BackendController : ControllerBase
{
    [HttpGet("/health")]
    public IActionResult CheckHealth()
    {
        return Ok();
    }
}