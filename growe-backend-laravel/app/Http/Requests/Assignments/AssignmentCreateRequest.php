<?php

namespace App\Http\Requests\Assignments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignmentCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:1', 'max:255'],
            'description' => ['required', 'string', 'min:1', 'max:10000'],
            'deadline' => ['required', 'date', 'after:now'],
            'status' => ['sometimes', 'string', Rule::in(['PENDING', 'IN_PROGRESS', 'COMPLETED'])],
            'priority' => ['sometimes', 'string', Rule::in(['LOW', 'MEDIUM', 'HIGH'])],
        ];
    }
}

