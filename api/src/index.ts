const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const path = new URL(req.url).pathname;
    let res;    
    if(req.method == "GET" && path == "/") res = Root()
    else res = new Response("Not Found", {status: 404});
    
    return res;
  },
});

function Root() {
  return new Response("Hello");
}


console.log(`Listening on http://localhost:${server.port} ...`);
