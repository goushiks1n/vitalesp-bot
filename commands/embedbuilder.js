const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embedbuilder')
    .setDescription('Create and send custom embeds with an interactive builder'),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('embed_modal')
      .setTitle('Embed Builder');

    const titleInput = new TextInputBuilder()
      .setCustomId('embed_title')
      .setLabel('Embed Title')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter embed title (optional)')
      .setRequired(false);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('embed_description')
      .setLabel('Embed Description')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter embed description (optional)')
      .setRequired(false);

    const colorInput = new TextInputBuilder()
      .setCustomId('embed_color')
      .setLabel('Color (Hex)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., #FF0000 or ff0000')
      .setRequired(false);

    const fieldsInput = new TextInputBuilder()
      .setCustomId('embed_fields')
      .setLabel('Fields (field1:value1|field2:value2)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Format: Name:Value|Name:Value (optional)')
      .setRequired(false);

    const footerInput = new TextInputBuilder()
      .setCustomId('embed_footer')
      .setLabel('Footer Text (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter footer text')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(fieldsInput),
      new ActionRowBuilder().addComponents(footerInput)
    );

    await interaction.showModal(modal);
  },
};
