import { Router } from "cartesi-router";
import { Wallet } from "cartesi-wallet";
import { hexToString } from "viem";

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

const wallet = new Wallet(new Map());
const router = new Router(wallet);
const etherPortalAddress = "0xffdbe43d4c855bf7e0f105c400a50857f53ab044";

async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));
  
  const msg_sender = data.metadata.msg_sender;

  // deposit ether
  if(msg_sender.toLowerCase() === etherPortalAddress.toLowerCase())
  {
    return router.process("ether_deposit", data.payload);
  }

  return "accept";
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));

  const url = hexToString(data.payload).split("/");

  return router.process(url[0], url[1]); // balance/account
}

async function send_request(output) 
{
  let endpoint = "/report";
  const response = await fetch(rollup_server + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(output),
  });
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      var output = await handler(rollup_req["data"]);
      await send_request(output);
      finish.status = "accept";
    }
  }
})();
