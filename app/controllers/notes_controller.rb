class NotesController < ApplicationController
  POSITION_FIELDS = %i[top right bottom left].freeze

  def update_position
    note = Note.find(params[:id])

    if note.update(position_attributes)
      render json: note.slice(:id, :top, :right, :bottom, :left)
    else
      render json: { errors: note.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update_expanded
    note = Note.find(params[:id])
    expanded = parse_expanded_param(params[:expanded])

    if expanded.nil?
      return render json: { errors: [ "Expanded must be true or false" ] }, status: :unprocessable_entity
    end

    if note.update(expanded: expanded)
      render json: note.slice(:id, :expanded)
    else
      render json: { errors: note.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def position_attributes
    POSITION_FIELDS.index_with do |field|
      raw = params[field]
      raw.present? ? raw.to_i : nil
    end
  end

  def parse_expanded_param(raw_value)
    case raw_value
    when true, "true", 1, "1" then true
    when false, "false", 0, "0" then false
    else
      nil
    end
  end
end
