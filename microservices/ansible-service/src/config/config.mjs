export const Config = () => ({
  Ansible: {
    PlaybooksDir: process.env.PLAYBOOKS_DIR,
  },

  Rabbit: {
    Url: process.env.AMQP_SERVER_URL,
    AnsibleQueueName: process.env.AMQP_ANSIBLE_QUEUE_NAME,
  },

  VPN: {
    FolderFilesPath: process.env.VPN_FILES_PATH,
  },

  SSH: {
    Host: process.env.SSH_HOST,
    Username: process.env.SSH_USER,
  },
});
