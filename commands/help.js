const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands and their descriptions')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('Get detailed info about a specific command')
        .setRequired(false)
    ),

  async execute(interaction) {
    const commandName = interaction.options.getString('command');

    if (commandName) {
      const commandFile = fs.readdirSync(path.join(__dirname)).find(file => file.startsWith(commandName) && file.endsWith('.js'));
      if (!commandFile) {
        return interaction.reply({ content: `❌ Command \`${commandName}\` not found.`, flags: MessageFlags.Ephemeral });
      }

      const command = require(path.join(__dirname, commandFile));
      const embed = new EmbedBuilder()
        .setTitle(`📖 Command: ${command.data.name}`)
        .setDescription(command.data.description)
        .setColor(0x3498db)
        .setFooter({ text: 'Vital ESports Bot' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const commandFiles = fs.readdirSync(path.join(__dirname)).filter(file => file.endsWith('.js') && file !== 'help.js');
    const commands = commandFiles.map(file => {
      const command = require(path.join(__dirname, file));
      return `\`/${command.data.name}\` - ${command.data.description}`;
    });

    const embed = new EmbedBuilder()
      .setTitle('📚 Vital ESports Bot - Commands')
      .setDescription(commands.join('\n') || 'No commands found.')
      .setColor(0xff0000)
      .setFooter({ text: `Use /help [command] to get more info | Total Commands: ${commands.length}` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
