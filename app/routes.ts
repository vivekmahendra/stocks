import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("ticker/:symbol", "routes/ticker.symbol.tsx"),
] satisfies RouteConfig;
