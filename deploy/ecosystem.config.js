/*
 * pm2 process file for the IIM AI Assistant.
 *
 *   pm2 start deploy/ecosystem.config.js
 *   pm2 save
 *
 * Settings come from the .env file in the app folder; nothing
 * secret belongs here.
 */
module.exports = {
  apps: [
    {
      name: "iim-chatbot",
      script: "server.js",
      cwd: __dirname + "/..",

      /*
       * One process: the answer cache, rate limits and rating IDs
       * live in memory, and Ollama is the bottleneck anyway.
       */
      instances: 1,
      exec_mode: "fork",

      env: {
        NODE_ENV: "production",
      },

      /* Wait for in-flight answers before restarting (see server.js). */
      kill_timeout: 16000,
      max_memory_restart: "400M",
      restart_delay: 3000,

      time: true,
      out_file: "/var/log/iim-chatbot/out.log",
      error_file: "/var/log/iim-chatbot/error.log",
      merge_logs: true,
    },
  ],
};
