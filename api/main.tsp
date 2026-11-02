import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service(#{ title: "Calendar API" })
@server("/", "Calendar")
namespace Calendar;

model Owner {
  name: string;
  timeZone: string;
}

@error
model ApiError {
  code: string;
  message: string;
}

@route("/api/owner")
@tag("owner")
interface OwnerApi {
  @get
  getOwner(): Owner | ApiError;
}
