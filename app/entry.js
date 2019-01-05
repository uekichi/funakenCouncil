'use strict';
import $ from 'jquery';

$('.aruaru-toggle-button').each((i, e) => {
  const button = $(e);
  button.click(() => {
    const titleId = button.data('title-id');
    const userId = button.data('user-id');
    const strategyId = button.data('strategy-id');
    const aruaru = parseInt(button.data('aruaru'));
    const nextAruaru = (aruaru + 1) % 3;
    $.post(`/titles/${titleId}/users/${userId}/strategies/${strategyId}`,
    { aruaru: nextAruaru },
    (data) => {
      button.data('aruaru', data.aruaru);
      const aruaruLabels = ['？？？？', 'あるある', 'ないない'];
      button.text(aruaruLabels[data.aruaru]);
    });
  });
});
