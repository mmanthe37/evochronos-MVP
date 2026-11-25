import { defineEval, includes } from "@cursor/bdk/evals";

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "functional-layer",
      description:
        "Asks for the functional suite and must report the Python harness layer.",
      async test(t) {
        await t.send(
          "Run the functional verification suite and tell me which layer actually executed.",
        );
        t.succeeded();
        t.calledTool("run_verification");
        t.check(t.reply, includes(/python_harness|Python/i));
      },
    },
  ],
});
