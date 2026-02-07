class NotesController < ApplicationController
  POSITION_FIELDS = %i[top right bottom left].freeze

  def update_position
    note = Note.find(params[:id])

    note.update!(position_attributes)

    render json: note.slice(:id, :top, :right, :bottom, :left)
  end

  private

  def position_attributes
    POSITION_FIELDS.index_with do |field|
      raw = params[field]
      raw.present? ? raw.to_i : nil
    end
  end
end
