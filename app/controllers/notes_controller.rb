class NotesController < ApplicationController
  POSITION_FIELDS = %i[top right bottom left].freeze
  NOTE_PRESENTATIONS = [
    { variant: "blue", width: "28rem", height: "12rem" },
    { variant: "yellow", width: "22rem", height: "10rem" }
  ].freeze

  before_action :authenticate_user!
  before_action :set_note, only: [ :update, :destroy, :update_geometry, :update_position, :update_expanded ]

  def create
    note = current_user.notes.create!(create_note_attributes)

    render json: {
      id: note.id,
      html: render_to_string(
        partial: "home/desktop_note",
        formats: [ :html ],
        locals: { note: desktop_note_payload(note) }
      )
    }, status: :created
  end

  def update
    if @note.update(note_params)
      render json: @note.slice(:id, :title, :content), status: :ok
    else
      render json: { errors: @note.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @note.destroy!
    head :no_content
  end

  def update_geometry
    if @note.update(geometry_params)
      render json: @note.slice(:id, :top, :right, :bottom, :left, :width, :height), status: :ok
    else
      render json: { errors: @note.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update_position
    if @note.update(position_attributes)
      render json: @note.slice(:id, :top, :right, :bottom, :left)
    else
      render json: { errors: @note.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update_expanded
    expanded = parse_expanded_param(params[:expanded])

    if expanded.nil?
      return render json: { errors: [ "Expanded must be true or false" ] }, status: :unprocessable_entity
    end

    if @note.update(expanded: expanded)
      render json: @note.slice(:id, :expanded)
    else
      render json: { errors: @note.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_note
    @note = current_user.notes.find(params[:id])
  end

  def note_params
    params.require(:note).permit(:title, :content)
  end

  def geometry_params
    params.require(:note).permit(:top, :right, :bottom, :left, :width, :height).to_h.transform_values do |value|
      value.present? ? value.to_i : nil
    end
  end

  def position_attributes
    POSITION_FIELDS.index_with do |field|
      raw = params[field]
      raw.present? ? raw.to_i : nil
    end
  end

  def create_note_attributes
    {
      title: "",
      content: "",
      expanded: true,
      width: 448,
      height: 192
    }.merge(position_attributes.compact)
  end

  def parse_expanded_param(raw_value)
    case raw_value
    when true, "true", 1, "1" then true
    when false, "false", 0, "0" then false
    else
      nil
    end
  end

  def desktop_note_payload(note)
    presentation_index = [ current_user.notes.count - 1, 0 ].max
    presentation = NOTE_PRESENTATIONS[presentation_index % NOTE_PRESENTATIONS.length]

    {
      id: note.id,
      title: note.title,
      content: note.content,
      top: note.top,
      right: note.right,
      bottom: note.bottom,
      left: note.left,
      expanded: note.expanded,
      width: note.width || css_pixel_value(presentation[:width]) || presentation[:width],
      variant: presentation[:variant],
      height: note.height || css_pixel_value(presentation[:height]) || presentation[:height]
    }
  end

  def css_pixel_value(value)
    size = value.to_s
    return size.to_i if size.ends_with?("px")
    return (size.to_f * 16).round if size.ends_with?("rem")

    nil
  end
end
