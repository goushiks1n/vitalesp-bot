const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message as the bot')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The message to send')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to send the message to (default: current channel)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({ 
        content: '❌ You need **Manage Messages** permission to use this command.', 
        flags: MessageFlags.Ephemeral 
      });
    }

    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await channel.send({ content: message });
      await interaction.reply({ 
        content: `✅ Message sent to ${channel.toString()}!`, 
        flags: MessageFlags.Ephemeral 
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({ 
        content: '❌ Failed to send the message. Make sure I have permission to send messages in that channel.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  },
};
