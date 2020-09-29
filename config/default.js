module.exports = {
  DB: {
    Type: "postgres",
    User: "duo",
    Password: "",
    Port: 5432,
    Host: "",
    Database: "duo",
  },

  Redis: {
    mode: "instance", //instance, cluster, sentinel
    ip: "",
    port: 6389,
    user: "duo",
    password: "",
    sentinels: {
      hosts: "",
      port: 16389,
      name: "redis-cluster",
    },
  },

  Security: {
    ip: "",
    port: 6389,
    user: "duo",
    password: "",
    mode: "instance", //instance, cluster, sentinel
    sentinels: {
      hosts: "",
      port: 16389,
      name: "redis-cluster",
    },
  },

  RabbitMQ: {
    ip: "",
    port: 5672,
    user: "admin",
    password: "admin",
    vhost: "/",
  },

  Mongo: {
    ip: "",
    port: "",
    dbname: "dvpdb",
    password: "",
    user: "duo",
    replicaset: "1",
    type: "mongodb",
  },

  Host: {
    Ip: "0.0.0.0",
    Port: 9094,
    Version: "1.0.0.0",
  },

  Campaign: {
    ip: "192.168.0.26",
    port: 8827,
    version: "1.0.0.0",
    dynamicPort: true,
  },

  Token:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",
};
