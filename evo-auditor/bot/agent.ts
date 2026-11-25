import { defineAgent } from "@cursor/bdk";

export default defineAgent({
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  local: {
    // Inherit the EvoChronos checkout so verification tools can run against it.
    workspaceDir: "..",
  },
});
