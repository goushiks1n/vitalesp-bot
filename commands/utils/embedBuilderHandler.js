const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');

async function handleModalSubmit(interaction) {
  try {
    const title = interaction.fields.getTextInputValue('embed_title') || null;
    const description = interaction.fields.getTextInputValue('embed_description') || null;
    const colorInput = interaction.fields.getTextInputValue('embed_color') || '#0099ff';
    const fieldsInput = interaction.fields.getTextInputValue('embed_fields') || '';
    const footer = interaction.fields.getTextInputValue('embed_footer') || null;

    let color;
    try {
      color = parseInt(colorInput.replace('#', ''), 16);
    } catch {
      color = 0x0099ff;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTimestamp();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (footer) embed.setFooter({ text: footer });

    // Parse fields
    if (fieldsInput) {
      const fieldPairs = fieldsInput.split('|');
      for (const pair of fieldPairs) {
        const [name, value] = pair.split(':');
        if (name && value) {
          embed.addFields({ name: name.trim(), value: value.trim(), inline: false });
        }
      }
    }

    const previewRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('embed_send')
        .setLabel('Send Embed')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('embed_edit')
        .setLabel('Edit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('embed_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    // Defer first, then reply
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const previewMessage = await interaction.editReply({
      content: 'Preview of your embed:',
      embeds: [embed],
      components: [previewRow]
    });

    // Handle button clicks
    const collector = previewMessage.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({ content: 'You cannot interact with this embed builder.', flags: MessageFlags.Ephemeral });
      }

      if (buttonInteraction.customId === 'embed_send') {
        await buttonInteraction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.channel.send({ embeds: [embed] });
        await buttonInteraction.editReply({ content: 'Embed sent to the channel!' });
        collector.stop();
      } else if (buttonInteraction.customId === 'embed_edit') {
        const editModal = new ModalBuilder()
          .setCustomId('embed_edit_modal')
          .setTitle('Edit Embed');

        editModal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('embed_title_edit')
              .setLabel('Embed Title')
              .setStyle(TextInputStyle.Short)
              .setValue(title || '')
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('embed_description_edit')
              .setLabel('Embed Description')
              .setStyle(TextInputStyle.Paragraph)
              .setValue(description || '')
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('embed_color_edit')
              .setLabel('Color (Hex)')
              .setStyle(TextInputStyle.Short)
              .setValue(colorInput)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('embed_fields_edit')
              .setLabel('Fields')
              .setStyle(TextInputStyle.Paragraph)
              .setValue(fieldsInput)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('embed_footer_edit')
              .setLabel('Footer Text')
              .setStyle(TextInputStyle.Short)
              .setValue(footer || '')
              .setRequired(false)
          )
        );

        await buttonInteraction.showModal(editModal);
      } else if (buttonInteraction.customId === 'embed_cancel') {
        await buttonInteraction.deferReply({ flags: MessageFlags.Ephemeral });
        await previewMessage.delete();
        collector.stop();
      }
    });

    collector.on('end', () => {
      previewMessage.edit({ components: [] }).catch(() => {});
    });
  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'An error occurred while processing the embed.', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.editReply({ content: 'An error occurred while processing the embed.' });
    }
  }
}

module.exports = {
  handleModalSubmit
};
